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
    RESERVATION_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 예약입니다."),

    //409
    FACILITY_HAS_STOCK(HttpStatus.CONFLICT, "재고가 등록된 지점은 삭제할 수 없습니다."),
    ITEM_HAS_STOCK(HttpStatus.CONFLICT, "재고가 등록된 품목은 삭제할 수 없습니다."),
    STOCK_HAS_RESERVATION(HttpStatus.CONFLICT, "예약이 걸린 재고는 삭제할 수 없습니다."),
    FACILITY_SUSPENDED(HttpStatus.CONFLICT, "운영이 중지된 지점의 재고는 예약할 수 없습니다."),
    STOCK_NOT_RESERVABLE(HttpStatus.CONFLICT, "사용 중지되었거나 유효기간이 지난 재고는 예약할 수 없습니다."),
    NOT_ENOUGH_STOCK(HttpStatus.CONFLICT, "가용 수량이 부족합니다."),
    ON_HAND_LESS_THAN_RESERVED(HttpStatus.CONFLICT, "예약된 수량보다 적게 바꿀 수 없습니다."),
    RESERVATION_NOT_HELD(HttpStatus.CONFLICT, "대기(HELD) 상태인 예약만 처리할 수 있습니다."),
    RESERVATION_EXPIRED(HttpStatus.CONFLICT, "만료된 예약입니다."),

    //500
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내 오류입니다");

    private final HttpStatus status;
    private final String message;

}
