package com.tea1.stockdspr.global.response.exception;

import lombok.Getter;

@Getter
public class CustomException extends RuntimeException {

    private final ErrorCode errorCode;

    public CustomException(ErrorCode errorCode) {
        super(errorCode.getMessage()); //로그에 찍힐 메세지
        this.errorCode = errorCode;
    }
}


