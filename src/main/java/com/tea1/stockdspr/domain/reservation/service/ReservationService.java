package com.tea1.stockdspr.domain.reservation.service;

import com.tea1.stockdspr.domain.facility.entity.FacilityStatus;
import com.tea1.stockdspr.domain.reservation.dto.ReservationRequestDTO;
import com.tea1.stockdspr.domain.reservation.dto.ReservationResponseDTO;
import com.tea1.stockdspr.domain.reservation.entity.Reservation;
import com.tea1.stockdspr.domain.reservation.entity.ReservationStatus;
import com.tea1.stockdspr.domain.reservation.repository.ReservationRepository;
import com.tea1.stockdspr.domain.stock.entity.Stock;
import com.tea1.stockdspr.domain.stock.entity.StockStatus;
import com.tea1.stockdspr.domain.stock.repository.StockRepository;
import com.tea1.stockdspr.global.response.exception.CustomException;
import com.tea1.stockdspr.global.response.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final StockRepository stockRepository;

    //재고(로트)에 임시 예약(HELD)을 만든다 (C-3)
    //동시성 제어 없음: 읽고 검사한 뒤 수량을 바꾸는 방식이라 동시 요청이면 초과 예약될 수 있음
    @Transactional
    public ReservationResponseDTO reserve(Long stockId, ReservationRequestDTO reservationRequestDTO) {

        //같은 idempotencyKey로 다시 보내면 처음 만든 예약을 그대로 반환
        String idempotencyKey = reservationRequestDTO.getIdempotencyKey();
        if (idempotencyKey != null) {
            Optional<Reservation> existing = reservationRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return toResponseDTO(existing.get());
            }
        }

        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new CustomException(ErrorCode.STOCK_NOT_FOUND));
        checkReservable(stock);

        //가용 수량이 부족하면 NOT_ENOUGH_STOCK
        stock.reserve(reservationRequestDTO.getQuantity());

        Reservation reservation = reservationRepository.save(
                new Reservation(stock, reservationRequestDTO.getQuantity(), idempotencyKey));
        log.info("임시 예약 생성 reservationId={} stockId={}", reservation.getId(), stockId);
        return toResponseDTO(reservation);
    }

    public ReservationResponseDTO findOne(Long reservationId) {
        return toResponseDTO(findReservation(reservationId));
    }

    public List<ReservationResponseDTO> findByFacility(Long facilityId) {
        return reservationRepository.findByFacilityId(facilityId).stream()
                .map(this::toResponseDTO)
                .toList();
    }

    //지점 확정 (C-4)
    @Transactional
    public ReservationResponseDTO confirm(Long reservationId) {

        Reservation reservation = findReservation(reservationId);

        //같은 응답을 다시 보내면 최초 결과를 그대로 반환 (C-4)
        if (reservation.getStatus() == ReservationStatus.CONFIRMED) {
            return toResponseDTO(reservation);
        }
        checkHeldAndNotExpired(reservation);

        reservation.confirm();
        log.info("예약 수락 reservationId={}", reservationId);
        return toResponseDTO(reservation);
    }

    //지점 거절 (C-4): 예약 수량 반환
    @Transactional
    public ReservationResponseDTO reject(Long reservationId) {

        Reservation reservation = findReservation(reservationId);

        if (reservation.getStatus() == ReservationStatus.REJECTED) {
            return toResponseDTO(reservation);
        }
        checkHeldAndNotExpired(reservation);

        reservation.reject();
        reservation.getStock().releaseReservation(reservation.getQuantity());
        log.info("예약 거절 reservationId={}", reservationId);
        return toResponseDTO(reservation);
    }

    //예약 취소 (C-5): HELD일 때만, 예약 수량 반환
    @Transactional
    public ReservationResponseDTO cancel(Long reservationId) {

        Reservation reservation = findReservation(reservationId);

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            return toResponseDTO(reservation);
        }
        if (reservation.getStatus() != ReservationStatus.HELD) {
            throw new CustomException(ErrorCode.RESERVATION_NOT_HELD);
        }

        reservation.cancel();
        reservation.getStock().releaseReservation(reservation.getQuantity());
        log.info("예약 취소 reservationId={}", reservationId);
        return toResponseDTO(reservation);
    }

    //만료 시각이 지난 HELD 예약을 EXPIRED로 바꾸고 수량 반환 (C-5)
    //스케줄러가 호출, 처리한 건수 반환
    @Transactional
    public int expireOverdue(LocalDateTime now) {

        List<Reservation> overdue = reservationRepository.findOverdue(ReservationStatus.HELD, now);

        for (Reservation reservation : overdue) {
            reservation.expire();
            reservation.getStock().releaseReservation(reservation.getQuantity());
            log.info("예약 만료 reservationId={}", reservation.getId());
        }
        return overdue.size();
    }

    //사용 중지·유효기간 지난 재고, 운영 중지 지점의 재고는 예약 불가
    private void checkReservable(Stock stock) {
        if (stock.getUsageStatus() != StockStatus.IN_USE) {
            throw new CustomException(ErrorCode.STOCK_NOT_RESERVABLE);
        }
        if (stock.getExpirationDate() != null && stock.getExpirationDate().isBefore(LocalDate.now())) {
            throw new CustomException(ErrorCode.STOCK_NOT_RESERVABLE);
        }
        if (stock.getFacility().getOperationStatus() == FacilityStatus.SUSPENDED) {
            throw new CustomException(ErrorCode.FACILITY_SUSPENDED);
        }
    }

    //HELD가 아니거나 만료 시각이 지났으면 처리 불가 (C-4)
    private void checkHeldAndNotExpired(Reservation reservation) {
        if (reservation.getStatus() != ReservationStatus.HELD) {
            throw new CustomException(ErrorCode.RESERVATION_NOT_HELD);
        }
        if (reservation.isExpired(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.RESERVATION_EXPIRED);
        }
    }

    //없으면 404
    private Reservation findReservation(Long reservationId) {
        return reservationRepository.findById(reservationId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESERVATION_NOT_FOUND));
    }

    private ReservationResponseDTO toResponseDTO(Reservation reservation) {
        return ReservationResponseDTO.builder()
                .id(reservation.getId())
                .stockId(reservation.getStock().getId())
                .facilityId(reservation.getStock().getFacility().getId())
                .quantity(reservation.getQuantity())
                .status(reservation.getStatus())
                .expiresAt(reservation.getExpiresAt())
                .build();
    }
}
