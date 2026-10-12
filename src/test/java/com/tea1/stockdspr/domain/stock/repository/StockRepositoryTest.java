package com.tea1.stockdspr.domain.stock.repository;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import com.tea1.stockdspr.domain.facility.repository.FacilityRepository;
import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.domain.stock.entity.Stock;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

@DataJpaTest
class StockRepositoryTest {

    @Autowired StockRepository stockRepository;
    @Autowired ItemRepository itemRepository;
    @Autowired FacilityRepository facilityRepository;
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

    // Facility의 기본 생성자가 protected라서 테스트에서는 리플렉션으로 생성한다.
    private Facility facility(String name) {
        Facility facility = BeanUtils.instantiateClass(Facility.class);
        facility.setFacilityName(name);
        return facility;
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
