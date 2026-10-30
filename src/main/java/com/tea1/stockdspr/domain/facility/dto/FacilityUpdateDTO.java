package com.tea1.stockdspr.domain.facility.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Getter;

@Getter
public class FacilityUpdateDTO {

    //공백 아닌 글자가 최소 하나 있어야 함
    @Pattern(regexp = ".*\\S.*", message = "기관 이름은 비워둘 수 없습니다.")
    private String facilityName;

    @Pattern(regexp = ".*\\S.*", message = "주소는 비워둘 수 없습니다.")
    private String address;

    private String contactName;

    private String contactNumber;
}
