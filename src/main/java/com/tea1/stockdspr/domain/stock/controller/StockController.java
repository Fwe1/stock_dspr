package com.tea1.stockdspr.domain.stock.controller;

import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.item.service.ItemService;
import com.tea1.stockdspr.domain.stock.dto.StockRequestDTO;
import com.tea1.stockdspr.domain.stock.dto.StockResponseDTO;
import com.tea1.stockdspr.domain.stock.service.StockService;
import com.tea1.stockdspr.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;
    private final ItemService itemService;

    @PostMapping("/item/{itemId}/stock")
    public ResponseEntity<ApiResponse<StockResponseDTO>> createStock(@PathVariable Long itemId, @RequestBody @Valid StockRequestDTO stockRequestDTO) {

        Long item = itemService.findOne(itemId).
        StockRequestDTO dto = stockService.createStock(StockRequestDTO);

        return

    }
}
