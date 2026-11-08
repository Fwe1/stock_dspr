package com.tea1.stockdspr.domain.facility.repository;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from Facility f where f.id = :id")
    Optional<Facility> lockForReceipt(@Param("id") Long id);

    @Query("SELECT f FROM Facility f WHERE f.facilityName = :facilityName")
    Optional<Facility> findByName(@Param("facilityName") String name);


}
