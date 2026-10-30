package com.tea1.stockdspr.domain.facility.dto;

import com.tea1.stockdspr.domain.facility.entity.FacilityStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacilityResponseDTO {

    private Long id;

    private String facilityName;

    private String address;

    private String contactName;

    private String contactNumber;

    private Double latitude;

    private Double longitude;

    private FacilityStatus operationStatus;


}
