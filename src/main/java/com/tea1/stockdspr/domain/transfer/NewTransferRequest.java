package com.tea1.stockdspr.domain.transfer;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public record NewTransferRequest(
        @NotNull UUID idempotencyKey,
        @NotNull @Positive Long itemId,
        @NotNull @Positive Integer quantity,
        @NotNull Instant neededAt,
        @NotBlank @Size(max = 200) String destination,
        @NotNull @Positive Integer radiusKm,
        @NotBlank @Pattern(regexp = "NORMAL|URGENT") String priority,
        @NotBlank @Size(max = 500) String reason) {
    public NewTransferRequest {
        if (destination != null) destination = destination.strip();
        if (reason != null) reason = reason.strip();
        if (neededAt != null) neededAt = neededAt.truncatedTo(ChronoUnit.MILLIS);
    }
}
