package com.tea1.stockdspr.domain.transfer;

import com.tea1.stockdspr.domain.facility.entity.FacilityStatus;
import com.tea1.stockdspr.domain.facility.repository.FacilityRepository;
import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.global.response.exception.CustomException;
import com.tea1.stockdspr.global.response.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransferRequestService {
    private final FacilityRepository facilities;
    private final ItemRepository items;
    private final TransferRequestRepository requests;

    @Transactional
    public TransferRequestView register(Long facilityId, NewTransferRequest input) {
        var facility = facilities.lockById(facilityId)
                .orElseThrow(() -> new CustomException(ErrorCode.FACILITY_NOT_FOUND));
        var previous = requests.findByFacility_IdAndIdempotencyKey(facilityId, input.idempotencyKey());
        if (previous.isPresent()) {
            if (!previous.get().matches(input)) throw new CustomException(ErrorCode.TRANSFER_KEY_CONFLICT);
            return TransferRequestView.of(previous.get());
        }
        if (facility.getOperationStatus() != FacilityStatus.ACTIVE) {
            throw new CustomException(ErrorCode.TRANSFER_FACILITY_SUSPENDED);
        }
        Instant now = Instant.now();
        if (!input.neededAt().isAfter(now)) throw new CustomException(ErrorCode.TRANSFER_DEADLINE);
        var item = items.findById(input.itemId()).orElseThrow(() -> new CustomException(ErrorCode.ITEM_NOT_FOUND));
        return TransferRequestView.of(requests.save(new TransferRequest(facility, item, input, now)));
    }

    public List<TransferRequestView> sent(Long facilityId) {
        if (!facilities.existsById(facilityId)) throw new CustomException(ErrorCode.FACILITY_NOT_FOUND);
        return requests.findByFacility_IdOrderByIdDesc(facilityId).stream().map(TransferRequestView::of).toList();
    }
}
