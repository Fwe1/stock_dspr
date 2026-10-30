package com.tea1.stockdspr.domain.stock.repository;

import com.tea1.stockdspr.domain.stock.entity.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {


    @Query("SELECT s FROM Stock s  WHERE s.item.id = :ItemId")
    List<Stock> findByItemId(@Param("ItemId") Long id);

    //삭제 시 조건에 필요
    boolean existsByItem_Id(Long itemId);

    //기관 삭제 시 조건에 필요
    boolean existsByFacility_Id(Long facilityId);

}
