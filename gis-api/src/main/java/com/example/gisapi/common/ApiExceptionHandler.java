package com.example.gisapi.common;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 모든 API의 오류 응답을 같은 형태로 맞춘다.
 * Spring 기본 오류 응답은 message를 빼고 보내서, 우리가 쓴 안내 문구가 화면까지 전달되지 않았다.
 * 형태: { timestamp, status, error, message, path }
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException e, HttpServletRequest req) {
        return body(e.getStatusCode(), e.getReason(), req);
    }

    /** 필수 파라미터 누락 (예: lng 없이 호출) */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissing(MissingServletRequestParameterException e,
            HttpServletRequest req) {
        return body(HttpStatus.BAD_REQUEST, "필수 파라미터가 없습니다: " + e.getParameterName(), req);
    }

    /** 파라미터 형식 오류 (예: r=abc) */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleType(MethodArgumentTypeMismatchException e,
            HttpServletRequest req) {
        return body(HttpStatus.BAD_REQUEST, "파라미터 형식이 올바르지 않습니다: " + e.getName(), req);
    }

    private static ResponseEntity<Map<String, Object>> body(HttpStatusCode status, String message,
            HttpServletRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status instanceof HttpStatus hs ? hs.getReasonPhrase() : status.toString());
        body.put("message", message);
        body.put("path", req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}
