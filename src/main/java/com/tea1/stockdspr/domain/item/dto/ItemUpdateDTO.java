package com.tea1.stockdspr.domain.item.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ItemUpdateDTO {

    //공백 아닌 글자가 최소 하나 있어야 함
    @Pattern(regexp = ".*\\S.*", message = "품목 이름은 비워둘 수 없습니다.")
    private String name;

    private String ingredients;

    private String storageConditions;
}
