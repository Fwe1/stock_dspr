package com.tea1.stockdspr.domain.facility.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter @Setter
@Table(name="facility")
public class Facility {

    @Id
    @GeneratedValue
    @Column(name = "facility_id")
    private Long id;

    private String facilityName;

    private String address;

    private String contactName;

    private String contactNumber;

    protected Facility() {}

}
