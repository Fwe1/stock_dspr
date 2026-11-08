package com.tea1.stockdspr.domain.stock.repository;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import com.tea1.stockdspr.domain.facility.entity.FacilityInventory;
import com.tea1.stockdspr.domain.stock.service.StockService;
import com.tea1.stockdspr.domain.facility.repository.FacilityRepository;
import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.domain.stock.entity.Stock;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.context.annotation.Import;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

@DataJpaTest
@Import(StockService.class)
class StockRepositoryTest {

    @Autowired StockRepository stockRepository;
    @Autowired ItemRepository itemRepository;
    @Autowired FacilityRepository facilityRepository;
    @Autowired StockService stockService;
    @PersistenceContext EntityManager em;

    @Test
    @DisplayName("같은 품목을 두 기관이 보유해도 기관별 수량이 따로 저장된다")
    void stocksAreSeparatedByFacility() {
        Item mask = itemRepository.save(Item.builder().name("KF94 마스크").build());
        Facility hospitalA = facilityRepository.save(facility("A병원"));
        Facility pharmacyB = facilityRepository.save(facility("B약국"));
        LocalDate expiration = LocalDate.of(2027, 3, 31);

        stockRepository.save(stock(mask, hospitalA, 30, expiration));
        stockRepository.save(stock(mask, pharmacyB, 50, expiration));
        em.flush();
        em.clear();

        List<Stock> stocks = stockRepository.findByItemId(mask.getId());

        assertThat(stocks)
                .extracting(s -> s.getFacility().getFacilityName(), Stock::getOnHandQty)
                .containsExactlyInAnyOrder(tuple("A병원", 30), tuple("B약국", 50));
    }

    @Test
    @DisplayName("같은 기관의 같은 품목도 유효기간이 다르면 별도 재고로 저장된다")
    void stocksAreSeparatedByExpirationDate() {
        Item mask = itemRepository.save(Item.builder().name("KF94 마스크").build());
        Facility hospitalA = facilityRepository.save(facility("A병원"));

        stockRepository.save(stock(mask, hospitalA, 30, LocalDate.of(2027, 2, 28)));
        stockRepository.save(stock(mask, hospitalA, 50, LocalDate.of(2027, 7, 31)));
        em.flush();
        em.clear();

        List<Stock> stocks = stockRepository.findByItemId(mask.getId());

        assertThat(stocks)
                .extracting(Stock::getExpirationDate, Stock::getOnHandQty)
                .containsExactlyInAnyOrder(
                        tuple(LocalDate.of(2027, 2, 28), 30),
                        tuple(LocalDate.of(2027, 7, 31), 50));
    }

    @Test
    @DisplayName("최소 비축량(FacilityInventory) 설정이 없는 품목도 재고를 등록할 수 있다")
    void stockCanBeSavedWithoutFacilityInventory() {
        Item gloves = itemRepository.save(Item.builder().name("니트릴 장갑").build());
        Facility hospitalA = facilityRepository.save(facility("A병원"));

        Stock saved = stockRepository.saveAndFlush(stock(gloves, hospitalA, 100, LocalDate.of(2028, 1, 31)));

        Long facilityInventoryCount = em
                .createQuery("select count(fi) from FacilityInventory fi", Long.class)
                .getSingleResult();
        assertThat(facilityInventoryCount).isZero();
        assertThat(stockRepository.findById(saved.getId())).isPresent();
    }

    @Test
    @DisplayName("기관 없이 재고를 저장할 수 없다")
    void stockRequiresFacility() {
        Item mask = itemRepository.save(Item.builder().name("KF94 마스크").build());

        assertThatThrownBy(() -> stockRepository.saveAndFlush(stock(mask, null, 30, LocalDate.of(2027, 3, 31))))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void scopedQueryIncludesOnlyTheSelectedFacilityAndItem() {
        Facility first = facilityRepository.save(facility("한빛"));
        Facility second = facilityRepository.save(facility("새봄"));
        Item item = itemRepository.save(Item.builder().name("품목 A").build());
        Item another = itemRepository.save(Item.builder().name("품목 B").build());
        Stock included = stockRepository.save(stock(item, first, 12, null));
        stockRepository.save(stock(item, second, 50, null));
        stockRepository.save(stock(another, first, 7, null));
        em.flush();
        em.clear();

        assertThat(stockRepository.findByFacility_IdAndItem_IdOrderById(first.getId(), item.getId()))
                .extracting(Stock::getId)
                .containsExactly(included.getId());
        assertThat(stockRepository.findByFacility_IdAndItem_IdOrderById(second.getId(), another.getId()))
                .isEmpty();
    }

    private Facility facility(String name) {
        return Facility.builder().facilityName(name).build();
    }

    @Test
    void overviewAppliesOneFacilityItemFloorToEligibleUnreservedLots() {
        var facility = facilityRepository.save(facility("한빛"));
        var other = facilityRepository.save(facility("새봄"));
        var item = itemRepository.save(Item.builder().name("품목 A").build());
        var today = LocalDate.now();
        em.persist(new FacilityInventory(item, facility, 10));
        var first = stock(item, facility, 30, today);
        first.reserve(5);
        stockRepository.save(first);
        stockRepository.save(stock(item, facility, 20, null));
        stockRepository.save(stock(item, facility, 80, today.minusDays(1)));
        var discarded = stock(item, facility, 60, today.plusDays(1));
        discarded.discardStock();
        stockRepository.save(discarded);
        stockRepository.save(stock(item, other, 8, today));
        var result = stockService.overview(facility.getId(), item.getId());
        assertThat(result.safetyStockQty()).isEqualTo(10);
        assertThat(result.availableQty()).isEqualTo(35);
        assertThat(result.lots()).hasSize(4);
        assertThat(stockService.overview(other.getId(), item.getId()).availableQty()).isEqualTo(8);
    }

    private Stock stock(Item item, Facility facility, int quantity, LocalDate expirationDate) {
        return Stock.builder()
                .item(item)
                .facility(facility)
                .onHandQty(quantity)
                .expirationDate(expirationDate)
                .build();
    }
}
