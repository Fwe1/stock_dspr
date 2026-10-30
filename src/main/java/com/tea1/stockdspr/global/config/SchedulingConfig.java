package com.tea1.stockdspr.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

//예약 만료 스케줄러(@Scheduled)를 켜기 위한 설정
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
