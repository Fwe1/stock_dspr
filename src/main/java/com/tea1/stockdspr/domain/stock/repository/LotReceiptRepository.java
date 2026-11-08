package com.tea1.stockdspr.domain.stock.repository;

import com.tea1.stockdspr.domain.stock.entity.LotReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LotReceiptRepository extends JpaRepository<LotReceipt, Long> {
    boolean existsByStockId(Long stockId);
    Optional<LotReceipt> findByFacilityIdAndRequestId(Long facilityId, UUID requestId);
}
