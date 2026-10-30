package com.tea1.stockdspr.domain.stock.controller;

import com.tea1.stockdspr.domain.item.service.ItemService;
import com.tea1.stockdspr.domain.stock.dto.StockRequestDTO;
import com.tea1.stockdspr.domain.stock.dto.StockResponseDTO;
import com.tea1.stockdspr.domain.stock.dto.StockUpdateDTO;
import com.tea1.stockdspr.domain.stock.service.StockService;
import com.tea1.stockdspr.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    //stock등록
    @PostMapping("/items/{itemId}/stocks")
    public ResponseEntity<ApiResponse<Map<String, Long>>> createStock(@PathVariable Long itemId, @RequestBody @Valid StockRequestDTO stockRequestDTO) {

        Long stockId = stockService.createStock(itemId, stockRequestDTO);
        Map<String, Long> result = Map.of("stockId", stockId);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.response(result));

    }

    //stock 단건 GET
    @GetMapping("/stocks/{stockId}")
    public ResponseEntity<ApiResponse<StockResponseDTO>> getStock(@PathVariable Long stockId) {

        StockResponseDTO result = stockService.findOne(stockId);

        return ResponseEntity.ok(ApiResponse.response(result));
    }

    //stock 다회건 GET
    @GetMapping("/items/{itemId}/stocks")
    public ResponseEntity<ApiResponse<List<StockResponseDTO>>> getStocks(@PathVariable Long itemId) {

        List<StockResponseDTO> result = stockService.findStockByItem(itemId);

        return ResponseEntity.ok(ApiResponse.response(result));
    }


    //stock 수정
    @PatchMapping("/stocks/{stockId}")
    public ResponseEntity<ApiResponse<Void>> updateStock(@PathVariable Long stockId, @RequestBody @Valid StockUpdateDTO stockUpdateDTO) {

        stockService.updateStock(stockId, stockUpdateDTO);

        return ResponseEntity.ok(ApiResponse.response(null));

    }

    //stock 폐기
    @PostMapping("/stocks/{stockId}/discard")
    public ResponseEntity<ApiResponse<Void>> discardStock(@PathVariable Long stockId) {

        stockService.discardStock(stockId);

        return ResponseEntity.ok(ApiResponse.response(null));
    }

    @DeleteMapping("/stocks/{stockId}")
    public ResponseEntity<ApiResponse<Void>> deleteStock(@PathVariable Long stockId) {

        stockService.deleteStock(stockId);

        return ResponseEntity.ok(ApiResponse.response(null));
    }

}
