package com.tea1.stockdspr.domain.facility.controller;

import com.tea1.stockdspr.domain.facility.dto.FacilityRequestDTO;
import com.tea1.stockdspr.domain.facility.dto.FacilityResponseDTO;
import com.tea1.stockdspr.domain.facility.dto.FacilityUpdateDTO;
import com.tea1.stockdspr.domain.facility.service.FacilityService;
import com.tea1.stockdspr.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FacilityController {

    private final FacilityService facilityService;

    //기관 등록
    //기관 Id만 반환
    @PostMapping("/facilities")
    public ResponseEntity<ApiResponse<Map<String, Long>>> createFacility(@RequestBody @Valid FacilityRequestDTO facilityRequestDTO) {

        Long facilityId = facilityService.createFacility(facilityRequestDTO);
        Map<String, Long> result = Map.of("facilityId", facilityId);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.response(result));
    }

    //기관 목록
    @GetMapping("/facilities")
    public ResponseEntity<ApiResponse<List<FacilityResponseDTO>>> getFacilities() {

        List<FacilityResponseDTO> result = facilityService.findFacilities();

        return ResponseEntity.ok(ApiResponse.response(result));
    }

    //기관 정보
    @GetMapping("/facilities/{facilityId}")
    public ResponseEntity<ApiResponse<FacilityResponseDTO>> getFacility(@PathVariable Long facilityId) {

        FacilityResponseDTO result = facilityService.findOne(facilityId);

        return ResponseEntity.ok(ApiResponse.response(result));
    }

    //기관 수정 (보낸 필드만 수정)
    //반환값 없음
    @PatchMapping("/facilities/{facilityId}")
    public ResponseEntity<ApiResponse<Void>> updateFacility(@PathVariable Long facilityId, @RequestBody @Valid FacilityUpdateDTO facilityUpdateDTO) {

        facilityService.updateFacility(facilityId, facilityUpdateDTO);

        return ResponseEntity.ok(ApiResponse.response(null));
    }

    //기관 삭제
    //반환값 없음
    @DeleteMapping("/facilities/{facilityId}")
    public ResponseEntity<ApiResponse<Void>> deleteFacility(@PathVariable Long facilityId) {

        facilityService.deleteFacility(facilityId);

        return ResponseEntity.ok(ApiResponse.response(null));
    }
}
