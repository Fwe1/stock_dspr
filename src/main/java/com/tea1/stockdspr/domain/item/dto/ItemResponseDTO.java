package com.tea1.stockdspr.domain.item.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ItemResponseDTO {

    private Long id;

    private String name;

    private String ingredients;

    private String storageConditions;

}
