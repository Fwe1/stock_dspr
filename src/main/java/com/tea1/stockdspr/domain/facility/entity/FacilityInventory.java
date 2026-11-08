package com.tea1.stockdspr.domain.facility.entity;

import com.tea1.stockdspr.domain.item.entity.Item;
import jakarta.persistence.*;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name="facility_inventory")
public class FacilityInventory {

    @Id
    @GeneratedValue
    @Column(name="facility_inventory_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="facility_id", nullable = false)
    private Facility facility;

    @Column(name = "safety_stock_qty", nullable = false)
    @ColumnDefault("0")
    @Check(constraints = "safety_stock_qty >= 0")
    private int safetyStockQty;

    protected FacilityInventory() {}

    public FacilityInventory(Item item, Facility facility) {
        this(item, facility, 0);
    }

    public FacilityInventory(Item item, Facility facility, int safetyStockQty) {
        if (safetyStockQty < 0) throw new IllegalArgumentException("최소 비축량은 0 이상이어야 합니다.");
        this.item = item;
        this.facility = facility;
        this.safetyStockQty = safetyStockQty;
    }
}
