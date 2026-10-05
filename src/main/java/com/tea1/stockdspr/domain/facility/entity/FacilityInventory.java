package com.tea1.stockdspr.domain.facility.entity;

import com.tea1.stockdspr.domain.item.entity.Item;
import jakarta.persistence.*;

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

    protected FacilityInventory() {}

    public FacilityInventory(Item item, Facility facility) {
        this.item = item;
        this.facility = facility;
    }
}
