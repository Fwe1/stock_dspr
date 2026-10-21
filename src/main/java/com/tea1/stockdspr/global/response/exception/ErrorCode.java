package com.tea1.stockdspr.global.response.exception;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    //400
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 입력입니다"),

    //404
    ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 아이템입니다."),
    FACILITY_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 지점입니다."),
    STOCK_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 재고입니다."),

    //500
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내 오류입니다");

    private final HttpStatus status;
    private final String message;

}
