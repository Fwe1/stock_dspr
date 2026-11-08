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
    Optional<Facility> lockById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from Facility f where f.id = (select s.facility.id from Stock s where s.id = :stockId)")
    Optional<Facility> lockForStock(@Param("stockId") Long stockId);

    @Query("select coalesce(max(i.safetyStockQty), 0) from FacilityInventory i " +
            "where i.facility.id = :facilityId and i.item.id = :itemId")
    int safetyStockQty(@Param("facilityId") Long facilityId, @Param("itemId") Long itemId);

    @Query("SELECT f FROM Facility f WHERE f.facilityName = :facilityName")
    Optional<Facility> findByName(@Param("facilityName") String name);


}
