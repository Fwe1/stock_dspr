package com.tea1.stockdspr.domain.stock.entity;

import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.facility.entity.Facility;
import jakarta.persistence.*;
import com.tea1.stockdspr.global.response.exception.CustomException;
import com.tea1.stockdspr.global.response.exception.ErrorCode;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDate;

@Entity
@Getter @Setter @Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name="stock")
public class Stock {

    @Id @GeneratedValue
    @Column(name = "stock_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="facility_id", nullable = false)
    private Facility facility;

    private int onHandQty;

    //예약됐지만 아직 출고되지 않은 수량 (B-0)
    @Column(nullable = false)
    @ColumnDefault("0")
    private int reservedQty;

    private LocalDate expirationDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private StockStatus usageStatus = StockStatus.IN_USE; //IN_USE, NOT_IN_USE

    //비지니스 로직
    public void restoreStock() {
        this.usageStatus = StockStatus.IN_USE;
    }

    public void discardStock() {
        this.usageStatus = StockStatus.NOT_IN_USE;
    }

    //가용 수량 = 실재고 - 예약 수량 (B-0, 최소 비축량은 아직 없음)
    public int getAvailableQty() {
        return onHandQty - reservedQty;
    }

    //예약 수량 확보
    public void reserve(int quantity) {
        if (getAvailableQty() < quantity) {
            throw new CustomException(ErrorCode.NOT_ENOUGH_STOCK);
        }
        this.reservedQty += quantity;
    }

    //거절·취소·만료 시 예약 수량 반환
    public void releaseReservation(int quantity) {
        this.reservedQty -= quantity;
    }

    public void stockUpdateInfo(Integer onHandQty, LocalDate expirationDate) {
        if (onHandQty != null) {
            //예약된 수량보다 적게 줄이면 가용 수량이 음수가 됨 (B-0)
            if (onHandQty < this.reservedQty) {
                throw new CustomException(ErrorCode.ON_HAND_LESS_THAN_RESERVED);
            }
            this.onHandQty = onHandQty;
        }
        if (expirationDate != null) {
            this.expirationDate = expirationDate;
        }
    }
}
