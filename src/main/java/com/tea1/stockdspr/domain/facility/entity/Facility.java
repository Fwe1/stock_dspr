package com.tea1.stockdspr.domain.facility.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Table(name="facility")
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder @NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Facility {

    @Id
    @GeneratedValue
    @Column(name = "facility_id")
    private Long id;

    private String facilityName;

    private String address;

    private String contactName;

    private String contactNumber;

    private Double latitude; //위도

    private Double longitude; //경도

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FacilityStatus operationStatus = FacilityStatus.ACTIVE; //운영상태


    //비지니스 로직
    //null인 필드는 건너뜀(PATCH)
    public void facilityUpdateInfo(String facilityName, String address, String contactName, String contactNumber) {
        if (facilityName != null) {
            this.facilityName = facilityName;
        }
        if (address != null) {
            this.address = address;
        }
        if (contactName != null) {
            this.contactName = contactName;
        }
        if (contactNumber != null) {
            this.contactNumber = contactNumber;
        }
    }

}
