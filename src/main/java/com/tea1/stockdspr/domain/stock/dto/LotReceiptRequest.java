package com.tea1.stockdspr.domain.stock.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;

public record LotReceiptRequest(
        @NotNull UUID requestId,
        @NotBlank @Size(max = 64) String lotNumber,
        @NotNull LocalDate expirationDate,
        @NotNull @Positive Integer quantity,
        @NotBlank @Size(max = 200) String reason) {
    public LotReceiptRequest {
        if (lotNumber != null) lotNumber = lotNumber.strip();
        if (reason != null) reason = reason.strip();
    }
}
