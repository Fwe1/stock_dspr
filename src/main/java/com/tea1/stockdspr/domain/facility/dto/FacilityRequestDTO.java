package com.tea1.stockdspr.domain.facility.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FacilityRequestDTO {

    @NotBlank
    private String facilityName;

    @NotBlank
    private String address;

    private String contactName;

    private String contactNumber;

    @DecimalMin("-90.0") @DecimalMax("90.0")
    private Double latitude;

    @DecimalMin("-180.0") @DecimalMax("180.0")
    private Double longitude;
}
