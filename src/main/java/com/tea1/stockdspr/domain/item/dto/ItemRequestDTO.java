package com.tea1.stockdspr.domain.item.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor @Builder
@AllArgsConstructor
public class ItemRequestDTO {

    @NotBlank
    private String name;

    private String ingredients;

    private String storageConditions;
}
