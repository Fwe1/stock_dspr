package com.tea1.stockdspr.domain.reservation.controller;

import com.tea1.stockdspr.domain.reservation.dto.ReservationRequestDTO;
import com.tea1.stockdspr.domain.reservation.dto.ReservationResponseDTO;
import com.tea1.stockdspr.domain.reservation.service.ReservationService;
import com.tea1.stockdspr.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    //재고(로트)에 임시 예약 생성
    @PostMapping("/stocks/{stockId}/reservations")
    public ResponseEntity<ApiResponse<ReservationResponseDTO>> createReservation(@PathVariable Long stockId,
                                                                                 @RequestBody @Valid ReservationRequestDTO reservationRequestDTO) {

        ReservationResponseDTO result = reservationService.reserve(stockId, reservationRequestDTO);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.response(result));
    }

    //예약 단건 GET
    @GetMapping("/reservations/{reservationId}")
    public ResponseEntity<ApiResponse<ReservationResponseDTO>> getReservation(@PathVariable Long reservationId) {

        ReservationResponseDTO result = reservationService.findOne(reservationId);

        return ResponseEntity.ok(ApiResponse.response(result));
    }

    //지점에 걸린 예약 목록
    @GetMapping("/facilities/{facilityId}/reservations")
    public ResponseEntity<ApiResponse<List<ReservationResponseDTO>>> getReservationsByFacility(@PathVariable Long facilityId) {

        List<ReservationResponseDTO> result = reservationService.findByFacility(facilityId);

        return ResponseEntity.ok(ApiResponse.response(result));
    }

    //지점 확정
    @PostMapping("/reservations/{reservationId}/confirm")
    public ResponseEntity<ApiResponse<ReservationResponseDTO>> confirm(@PathVariable Long reservationId) {

        ReservationResponseDTO result = reservationService.confirm(reservationId);

        return ResponseEntity.ok(ApiResponse.response(result));
    }

    //지점 거절
    @PostMapping("/reservations/{reservationId}/reject")
    public ResponseEntity<ApiResponse<ReservationResponseDTO>> reject(@PathVariable Long reservationId) {

        ReservationResponseDTO result = reservationService.reject(reservationId);

        return ResponseEntity.ok(ApiResponse.response(result));
    }

    //예약 취소
    @PostMapping("/reservations/{reservationId}/cancel")
    public ResponseEntity<ApiResponse<ReservationResponseDTO>> cancel(@PathVariable Long reservationId) {

        ReservationResponseDTO result = reservationService.cancel(reservationId);

        return ResponseEntity.ok(ApiResponse.response(result));
    }
}
