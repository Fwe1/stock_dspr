package com.tea1.stockdspr.domain.item.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ItemRequestDTO {

    @NotBlank
    private String name;

    private String ingredients;

    private String storageConditions;
}
