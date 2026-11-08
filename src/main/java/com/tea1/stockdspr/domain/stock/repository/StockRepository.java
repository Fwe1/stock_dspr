package com.tea1.stockdspr.domain.stock.repository;

import com.tea1.stockdspr.domain.stock.entity.Stock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {


    @Query("SELECT s FROM Stock s  WHERE s.item.id = :ItemId")
    List<Stock> findByItemId(@Param("ItemId") Long id);

    List<Stock> findByFacility_IdAndItem_IdOrderById(Long facilityId, Long itemId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Stock> findByFacility_IdAndItem_IdAndLotNumber(Long facilityId, Long itemId, String lotNumber);

    //삭제 시 조건에 필요
    boolean existsByItem_Id(Long itemId);

    //기관 삭제 시 조건에 필요
    boolean existsByFacility_Id(Long facilityId);

    //가용 수량이 충분할 때만 예약 수량을 늘림. 바뀐 행 수를 돌려줌
    @Modifying
    @Query("UPDATE Stock s SET s.reservedQty = s.reservedQty + :quantity " +
            "WHERE s.id = :stockId AND s.onHandQty - s.reservedQty >= :quantity")
    int increaseReservedQty(@Param("stockId") Long stockId, @Param("quantity") int quantity);

    //예약 수량을 돌려준다. 음수가 되는 경우는 막는다
    @Modifying
    @Query("UPDATE Stock s SET s.reservedQty = s.reservedQty - :quantity " +
            "WHERE s.id = :stockId AND s.reservedQty >= :quantity")
    int decreaseReservedQty(@Param("stockId") Long stockId, @Param("quantity") int quantity);

}
