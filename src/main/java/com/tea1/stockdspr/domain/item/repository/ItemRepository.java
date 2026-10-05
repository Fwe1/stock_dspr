package com.tea1.stockdspr.domain.item.repository;

import com.tea1.stockdspr.domain.item.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;


@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {

    @Query("SELECT i FROM Item i where i.name = :itemName")
    List<Item> findByItemName(@Param("itemName") String name);

}
