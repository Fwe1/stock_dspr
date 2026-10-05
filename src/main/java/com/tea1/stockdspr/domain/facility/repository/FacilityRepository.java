package com.tea1.stockdspr.domain.facility.repository;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, Long> {

    @Query("SELECT f FROM Facility f WHERE f.facilityName = :facilityName")
    Optional<Facility> findByName(@Param("facilityName") String name);


}
