package com.tea1.stockdspr.domain.reservation.repository;

import com.tea1.stockdspr.domain.reservation.entity.Reservation;
import com.tea1.stockdspr.domain.reservation.entity.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    //같은 예약 재전송 확인용
    Optional<Reservation> findByIdempotencyKey(String idempotencyKey);

    //재고 삭제 시 조건에 필요
    boolean existsByStock_Id(Long stockId);

    //지점에 걸린 예약 목록, 최신순
    //stock을 같이 가져와서 지점 id를 꺼낼 때 추가 쿼리가 안 나감
    @Query(" SELECT r FROM Reservation r JOIN FETCH r.stock s WHERE s.facility.id = :facilityId ORDER BY r.id DESC ")
    List<Reservation> findByFacilityId(@Param("facilityId") Long facilityId);

    //만료 대상: 상태가 status이고 만료 시각이 지난 예약
    //수량 반환에 stock이 필요해서 같이 가져옴
    @Query(" SELECT r FROM Reservation r JOIN FETCH r.stock WHERE r.status = :status AND r.expiresAt <= :now ")
    List<Reservation> findOverdue(@Param("status") ReservationStatus status, @Param("now") LocalDateTime now);
}
