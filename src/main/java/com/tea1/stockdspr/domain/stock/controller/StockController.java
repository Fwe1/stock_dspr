package com.tea1.stockdspr.domain.stock.controller;

import com.tea1.stockdspr.domain.item.service.ItemService;
import com.tea1.stockdspr.domain.stock.dto.StockRequestDTO;
import com.tea1.stockdspr.domain.stock.dto.StockResponseDTO;
import com.tea1.stockdspr.domain.stock.service.StockService;
import com.tea1.stockdspr.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;
    private final ItemService itemService;

    @PostMapping("/item/{itemId}/stock")
    public ResponseEntity<ApiResponse<Map<String, Long>>> createStock(@PathVariable Long itemId, @RequestBody @Valid StockRequestDTO stockRequestDTO) {

        Long stockId = stockService.createStock(itemId, stockRequestDTO);
        Map<String, Long> result = Map.of("stockId", stockId);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.response(result));

    }

    @GetMapping("/stock/{stockId}")
    public ResponseEntity<ApiResponse<StockResponseDTO>> getStock(@PathVariable Long itemId, )
}
