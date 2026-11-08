package com.tea1.stockdspr.domain.transfer;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransferRequestRepository extends JpaRepository<TransferRequest, Long> {
    Optional<TransferRequest> findByFacility_IdAndIdempotencyKey(Long facilityId, UUID key);
    @EntityGraph(attributePaths = "item")
    List<TransferRequest> findByFacility_IdOrderByIdDesc(Long facilityId);
    boolean existsByFacility_Id(Long facilityId);
    boolean existsByItem_Id(Long itemId);
}
