package com.tea1.stockdspr.domain.reservation.scheduler;

import com.tea1.stockdspr.domain.reservation.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationExpireScheduler {

    private final ReservationService reservationService;

    //1분마다 만료 시각이 지난 HELD 예약 정리 (C-5)
    @Scheduled(fixedDelay = 60_000)
    public void expireReservations() {
        int count = reservationService.expireOverdue(LocalDateTime.now());
        if (count > 0) {
            log.info("예약 만료 처리 {}건", count);
        }
    }
}
