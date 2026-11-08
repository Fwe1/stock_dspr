package com.tea1.stockdspr.domain.stock.repository;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import com.tea1.stockdspr.domain.facility.repository.FacilityRepository;
import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.domain.stock.dto.LotReceiptRequest;
import com.tea1.stockdspr.domain.stock.service.StockService;
import com.tea1.stockdspr.global.response.exception.CustomException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@Import(StockService.class)
class LotReceiptTest {
    @Autowired StockService service;
    @Autowired FacilityRepository facilities;
    @Autowired ItemRepository items;
    @Autowired LotReceiptRepository receipts;

    @Test
    void retryAddsNothingButASecondDeliveryIncreasesOnlyTheSelectedFacility() {
        var first = facilities.save(Facility.builder().facilityName("한빛").build()).getId();
        var second = facilities.save(Facility.builder().facilityName("새봄").build()).getId();
        var item = items.save(Item.builder().name("품목 A").build()).getId();
        var expiry = LocalDate.now().plusYears(1);
        var delivery = new LotReceiptRequest(UUID.randomUUID(), "LOT-A", expiry, 30, "초도 입고");
        var stockId = service.receiveLot(first, item, delivery);
        assertThat(service.receiveLot(first, item, delivery)).isEqualTo(stockId);
        var extra = new LotReceiptRequest(UUID.randomUUID(), "LOT-A", expiry, 12, "추가 입고");
        assertThat(service.receiveLot(first, item, extra)).isEqualTo(stockId);
        assertThat(service.receiveLot(second, item, delivery)).isNotEqualTo(stockId);
        assertThat(service.findByFacilityAndItem(first, item)).singleElement()
                .satisfies(row -> {
                    assertThat(row.getOnHandQty()).isEqualTo(42);
                    assertThat(row.getReservedQty()).isZero();
                    assertThat(row.getLotNumber()).isEqualTo("LOT-A");
                });
        assertThat(service.findByFacilityAndItem(second, item)).singleElement()
                .satisfies(row -> assertThat(row.getOnHandQty()).isEqualTo(30));
        assertThat(receipts.count()).isEqualTo(3);
    }

    @Test
    void refusesConflictingExpiryForAnExistingLot() {
        var org = facilities.save(Facility.builder().facilityName("한빛").build()).getId();
        var item = items.save(Item.builder().name("품목 A").build()).getId();
        var expiry = LocalDate.now().plusYears(1);
        service.receiveLot(org, item, new LotReceiptRequest(UUID.randomUUID(), "LOT-A", expiry, 20, "초도 입고"));
        var conflict = new LotReceiptRequest(UUID.randomUUID(), "LOT-A", expiry.plusDays(1), 5, "추가 입고");
        assertThatThrownBy(() -> service.receiveLot(org, item, conflict)).isInstanceOf(CustomException.class);
    }
}
