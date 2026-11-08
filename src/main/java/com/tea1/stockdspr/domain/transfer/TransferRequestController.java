package com.tea1.stockdspr.domain.transfer;

import com.tea1.stockdspr.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/facilities/{facilityId}/transfer-requests")
@RequiredArgsConstructor
public class TransferRequestController {
    private final TransferRequestService service;

    @PostMapping
    public ApiResponse<TransferRequestView> register(@PathVariable Long facilityId,
                                                     @Valid @RequestBody NewTransferRequest input) {
        return ApiResponse.response(service.register(facilityId, input));
    }

    @GetMapping
    public ApiResponse<List<TransferRequestView>> sent(@PathVariable Long facilityId) {
        return ApiResponse.response(service.sent(facilityId));
    }

}
