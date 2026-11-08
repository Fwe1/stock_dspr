package com.tea1.stockdspr.domain.transfer;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import com.tea1.stockdspr.domain.item.entity.Item;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transfer_request", uniqueConstraints =
        @UniqueConstraint(columnNames = {"facility_id", "idempotency_key"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
public class TransferRequest {
    @Id @GeneratedValue private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "facility_id") private Facility facility;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id") private Item item;
    @Column(name = "idempotency_key", nullable = false) private UUID idempotencyKey;
    @Column(nullable = false) private int quantity;
    @Column(nullable = false) private Instant neededAt;
    @Column(nullable = false, length = 200) private String destination;
    @Column(nullable = false) private int radiusKm;
    @Column(nullable = false) private String priority;
    @Column(nullable = false, length = 500) private String reason;
    @Column(nullable = false) private String status;
    @Column(nullable = false) private Instant createdAt;

    public TransferRequest(Facility facility, Item item, NewTransferRequest request, Instant createdAt) {
        this.facility = facility;
        this.item = item;
        this.idempotencyKey = request.idempotencyKey();
        this.quantity = request.quantity();
        this.neededAt = request.neededAt();
        this.destination = request.destination();
        this.radiusKm = request.radiusKm();
        this.priority = request.priority();
        this.reason = request.reason();
        this.status = "REQUESTED";
        this.createdAt = createdAt;
    }

    public boolean matches(NewTransferRequest request) {
        return item.getId().equals(request.itemId()) && quantity == request.quantity()
                && neededAt.equals(request.neededAt()) && destination.equals(request.destination())
                && radiusKm == request.radiusKm() && priority.equals(request.priority()) && reason.equals(request.reason());
    }
}
