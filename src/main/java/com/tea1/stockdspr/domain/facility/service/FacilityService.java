package com.tea1.stockdspr.domain.facility.service;

import com.tea1.stockdspr.domain.facility.dto.FacilityRequestDTO;
import com.tea1.stockdspr.domain.facility.dto.FacilityResponseDTO;
import com.tea1.stockdspr.domain.facility.dto.FacilityUpdateDTO;
import com.tea1.stockdspr.domain.facility.entity.Facility;
import com.tea1.stockdspr.domain.facility.repository.FacilityRepository;
import com.tea1.stockdspr.domain.stock.repository.StockRepository;
import com.tea1.stockdspr.global.response.exception.CustomException;
import com.tea1.stockdspr.global.response.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class FacilityService {

    private final FacilityRepository facilityRepository;
    private final StockRepository stockRepository;

    //C
    @Transactional
    public Long createFacility(FacilityRequestDTO dto) {

        Facility facility = Facility.builder()
                .facilityName(dto.getFacilityName())
                .address(dto.getAddress())
                .contactName(dto.getContactName())
                .contactNumber(dto.getContactNumber())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .build();

        Facility savedFacility = facilityRepository.save(facility);
        return savedFacility.getId();
    }

    //R
    public FacilityResponseDTO findOne(Long facilityId) {

        Facility facility = findFacility(facilityId);
        return toResponseDTO(facility);
    }

    public List<FacilityResponseDTO> findFacilities() {

        return facilityRepository.findAll().stream()
                .map(this::toResponseDTO)
                .toList();
    }

    //U
    @Transactional
    public void updateFacility(Long facilityId, FacilityUpdateDTO dto) {

        Facility facility = findFacility(facilityId);
        facility.facilityUpdateInfo(dto.getFacilityName(), dto.getAddress(), dto.getContactName(), dto.getContactNumber());
    }

    //D
    @Transactional
    public void deleteFacility(Long facilityId) {

        Facility facility = findFacility(facilityId);

        //재고가 남아 있는 기관은 FK 때문에 지울 수 없음
        if (stockRepository.existsByFacility_Id(facilityId)) {
            throw new CustomException(ErrorCode.FACILITY_HAS_STOCK);
        }

        facilityRepository.delete(facility);
    }

    //없으면 404
    private Facility findFacility(Long facilityId) {
        return facilityRepository.findById(facilityId)
                .orElseThrow(() -> new CustomException(ErrorCode.FACILITY_NOT_FOUND));
    }

    private FacilityResponseDTO toResponseDTO(Facility facility) {
        return FacilityResponseDTO.builder()
                .id(facility.getId())
                .facilityName(facility.getFacilityName())
                .address(facility.getAddress())
                .contactName(facility.getContactName())
                .contactNumber(facility.getContactNumber())
                .latitude(facility.getLatitude())
                .longitude(facility.getLongitude())
                .operationStatus(facility.getOperationStatus())
                .build();
    }

}
