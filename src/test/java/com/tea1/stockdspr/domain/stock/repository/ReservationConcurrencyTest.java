package com.tea1.stockdspr.domain.stock.repository;

import com.tea1.stockdspr.domain.facility.repository.FacilityRepository;
import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.domain.reservation.dto.ReservationRequestDTO;
import com.tea1.stockdspr.domain.reservation.service.ReservationService;
import com.tea1.stockdspr.domain.stock.entity.Stock;
import com.tea1.stockdspr.global.response.exception.CustomException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import com.tea1.stockdspr.domain.facility.entity.Facility;
import com.tea1.stockdspr.domain.item.entity.Item;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@SpringBootTest            // @Transactional 붙이지 않는다
@ActiveProfiles("pgtest")  // PostgreSQL 테스트 DB를 보게 한다
class ReservationConcurrencyTest {

    @Autowired ReservationService reservationService;
    @Autowired StockRepository stockRepository;
    @Autowired FacilityRepository facilityRepository;
    @Autowired ItemRepository itemRepository;

    // facility, item 저장소도 주입해서 준비 데이터를 만든다

    // 반복할 때마다 테스트 객체가 새로 만들어져서 static이어야 5번의 결과가 쌓인다
    static List<Integer> successes = new ArrayList<>();

    @RepeatedTest(5)
    void 재고_100개에_1000건이_동시에_예약하면_100건만_성공한다() throws Exception {

        //일단 facility, stock 생성
        Facility facility = facilityRepository.save(Facility.builder().facilityName("테스트지점").address("서울").build());
        Item item = itemRepository.save(Item.builder().name("훠이자").build());
        Stock stock = stockRepository.save(Stock.builder().item(item).facility(facility).onHandQty(100).build());
        Long stockId = stock.getId();

        int requests = 1000;
        ExecutorService pool = Executors.newFixedThreadPool(32); //스레드 32개 풀 생성
        CountDownLatch start = new CountDownLatch(1);       // 다 같이 출발시키는 신호
        CountDownLatch done = new CountDownLatch(requests);  // 다 끝날 때까지 기다리는 용도
        AtomicInteger success = new AtomicInteger();
        AtomicInteger notEnough = new AtomicInteger();

        for (int i = 0; i < requests; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    reservationService.reserve(stockId, dto(1, null));
                    success.incrementAndGet();
                } catch (CustomException e) {
                    notEnough.incrementAndGet();   // 실패 사유별로 세면 됨
                } catch (Exception e) {
                    // 예상 못 한 예외도 따로 센다
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        done.await();
        pool.shutdown();


        Stock after = stockRepository.findById(stockId).orElseThrow();
        successes.add(success.get());
        System.out.println("성공=" + success.get() + ", 수량부족=" + notEnough.get() + ", reservedQty=" + after.getReservedQty());

        assertThat(success.get()).as("성공 건수 (재고 100개, 요청 1000건)").isEqualTo(100);
        assertThat(notEnough.get()).isEqualTo(900);
        assertThat(after.getReservedQty()).isEqualTo(100);
        // HELD 예약 행의 quantity 합도 100인지 확인하면 더 확실하다
    }

    // 반복이 실패해도 5번이 다 끝난 뒤 한 번 실행된다
    @AfterAll
    static void 결과_요약() {
        System.out.println("성공 건수 " + successes + " 평균=" + successes.stream().mapToInt(i -> i).average().orElse(0));
    }

    // ReservationRequestDTO에는 생성자·setter가 없어서 테스트에서는 이렇게 값을 넣었다
    private ReservationRequestDTO dto(int quantity, String key) {
        ReservationRequestDTO dto = new ReservationRequestDTO();
        ReflectionTestUtils.setField(dto, "quantity", quantity);
        ReflectionTestUtils.setField(dto, "idempotencyKey", key);
        return dto;
    }


}

