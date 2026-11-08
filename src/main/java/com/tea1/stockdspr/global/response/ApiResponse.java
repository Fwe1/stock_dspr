package com.tea1.stockdspr.global.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;

    public static <T> ApiResponse<T> response(T data) {
        return new ApiResponse<>(true, "성공", data);
    }

//    public static <T> ApiResponse exception(T data) {
//        return new ApiResponse<>(false, "실패", data);
//    }

    public static ApiResponse<Void> fail(String message) {
        return new ApiResponse<>(false, message, null);
    }


}
