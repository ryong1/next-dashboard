package com.example.gisapi.util;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * 컨트롤러에서 던지는 오류를 짧게 만들기 위한 함수.
 * 응답 형태는 {@link com.example.gisapi.common.ApiExceptionHandler}가 정한다.
 */
public final class ApiErrors {

    private ApiErrors() {
    }

    public static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    public static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
