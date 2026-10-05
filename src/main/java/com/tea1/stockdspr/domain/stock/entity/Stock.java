package com.tea1.stockdspr.domain.stock.entity;

import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.facility.entity.Facility;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Getter @Setter @Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name="stock")
public class Stock {

    @Id @GeneratedValue
    @Column(name = "stock_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="facility_id", nullable = false)
    private Facility facility;

    private int onHandQty;

    private LocalDate expirationDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private StockStatus usageStatus = StockStatus.IN_USE; //IN_USE, NOT_IN_USE

    //비지니스 로직
    public void restoreStock() {
        this.usageStatus = StockStatus.IN_USE;
    }

    public void discardStock() {
        this.usageStatus = StockStatus.NOT_IN_USE;
    }
}
