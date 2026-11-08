package com.tea1.stockdspr.domain.reservation.entity;

import com.tea1.stockdspr.domain.stock.entity.Stock;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "reservation", indexes = {
        @Index(name = "idx_reservation_status_expires", columnList = "status, expires_at")
})
public class Reservation {

    //임시 예약 유지 시간 (C-3 기본 10분)
    public static final long HOLD_MINUTES = 10;

    @Id @GeneratedValue
    @Column(name = "reservation_id")
    private Long id;

    //예약을 건 재고(로트). 지점은 stock.facility
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private Stock stock;

    @Column(nullable = false)
    private int quantity;

    //같은 예약 재전송 구분용. 안 보내면 null (unique여도 null은 여러 개 허용)
    @Column(unique = true, length = 100)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReservationStatus status;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public Reservation(Stock stock, int quantity, String idempotencyKey) {
        this.stock = stock;
        this.quantity = quantity;
        this.idempotencyKey = idempotencyKey;
        this.status = ReservationStatus.HELD;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = this.createdAt.plusMinutes(HOLD_MINUTES);
    }

    //비지니스 로직
    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }

    public void confirm() {
        this.status = ReservationStatus.CONFIRMED;
    }

    public void reject() {
        this.status = ReservationStatus.REJECTED;
    }

    public void cancel() {
        this.status = ReservationStatus.CANCELLED;
    }

    public void expire() {
        this.status = ReservationStatus.EXPIRED;
    }
}
