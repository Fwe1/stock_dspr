package com.tea1.stockdspr.domain.stock.entity;

import com.tea1.stockdspr.domain.stock.dto.LotReceiptRequest;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "lot_receipt", uniqueConstraints = @UniqueConstraint(columnNames = {"facility_id", "request_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LotReceipt {
    @Id @GeneratedValue private Long id;
    @Column(name = "request_id", nullable = false) private UUID requestId;
    @Column(name = "facility_id", nullable = false) private Long facilityId;
    @Column(nullable = false) private Long itemId;
    @Column(nullable = false) private Long stockId;
    @Column(nullable = false, length = 64) private String lotNumber;
    @Column(nullable = false) private LocalDate expirationDate;
    @Column(nullable = false) private int quantity;
    @Column(nullable = false) private int balanceAfter;
    @Column(nullable = false, length = 200) private String reason;
    @Column(nullable = false) private Instant recordedAt;

    public LotReceipt(Stock stock, LotReceiptRequest request) {
        facilityId = stock.getFacility().getId();
        itemId = stock.getItem().getId();
        stockId = stock.getId();
        lotNumber = stock.getLotNumber();
        expirationDate = stock.getExpirationDate();
        quantity = request.quantity();
        balanceAfter = stock.getOnHandQty();
        reason = request.reason();
        recordedAt = Instant.now();
        requestId = request.requestId();
    }

    public boolean matches(Long item, LotReceiptRequest request) {
        return itemId.equals(item) && lotNumber.equals(request.lotNumber())
                && expirationDate.equals(request.expirationDate())
                && quantity == request.quantity() && reason.equals(request.reason());
    }
}
