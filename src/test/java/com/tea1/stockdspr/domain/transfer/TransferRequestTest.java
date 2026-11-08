package com.tea1.stockdspr.domain.transfer;

import com.tea1.stockdspr.domain.facility.entity.Facility;
import com.tea1.stockdspr.domain.facility.entity.FacilityStatus;
import com.tea1.stockdspr.domain.facility.repository.FacilityRepository;
import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.global.response.exception.CustomException;
import com.tea1.stockdspr.global.response.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@Import(TransferRequestService.class)
class TransferRequestTest {
    @Autowired FacilityRepository facilities;
    @Autowired ItemRepository items;
    @Autowired TransferRequestService service;

    @Test
    void sameKeyReturnsSameRequestAndOtherFacilitiesCannotSeeItInTheirList() {
        var org = facilities.save(Facility.builder().facilityName("한빛").build()).getId();
        var other = facilities.save(Facility.builder().facilityName("새봄").build()).getId();
        var item = items.save(Item.builder().name("품목 A").build()).getId();
        var key = UUID.randomUUID();
        var due = Instant.now().plusSeconds(7200);
        var input = new NewTransferRequest(key, item, 20, due, "본관", 5, "URGENT", "병동 보충");
        var result = service.register(org, input);
        assertThat(service.register(org, input).requestNumber()).isEqualTo(result.requestNumber());
        assertThat(service.sent(org)).singleElement().satisfies(r -> {
            assertThat(r.requestNumber()).isEqualTo(result.requestNumber());
            assertThat(r.status()).isEqualTo("REQUESTED");
        });
        assertThat(service.sent(other)).isEmpty();
        var changed = new NewTransferRequest(key, item, 21, due, "본관", 5, "URGENT", "병동 보충");
        assertThatThrownBy(() -> service.register(org, changed))
                .isInstanceOfSatisfying(CustomException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.TRANSFER_KEY_CONFLICT));
    }

    @Test
    void rejectsNewRequestBySuspendedFacility() {
        var org = facilities.save(Facility.builder().facilityName("중지 기관").operationStatus(FacilityStatus.SUSPENDED).build()).getId();
        var item = items.save(Item.builder().name("품목 A").build()).getId();
        var input = new NewTransferRequest(UUID.randomUUID(), item, 1, Instant.now().plusSeconds(7200), "본관", 3, "NORMAL", "보충");
        assertThatThrownBy(() -> service.register(org, input))
                .isInstanceOfSatisfying(CustomException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.TRANSFER_FACILITY_SUSPENDED));
    }
}
