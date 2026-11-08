package com.tea1.stockdspr.domain.transfer;

import java.time.Instant;

public record TransferRequestView(String requestNumber, Long facilityId, Long itemId, String itemName,
                                  int quantity, Instant neededAt, String destination, int radiusKm,
                                  String priority, String reason, String status, Instant createdAt) {
    static TransferRequestView of(TransferRequest r) {
        return new TransferRequestView("TR-" + r.getId(), r.getFacility().getId(), r.getItem().getId(),
                r.getItem().getName(), r.getQuantity(), r.getNeededAt(), r.getDestination(),
                r.getRadiusKm(), r.getPriority(), r.getReason(), r.getStatus(), r.getCreatedAt());
    }
}
