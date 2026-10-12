package com.tea1.stockdspr.domain.item.controller;

import com.tea1.stockdspr.domain.item.dto.ItemRequestDTO;
import com.tea1.stockdspr.domain.item.dto.ItemResponseDTO;
import com.tea1.stockdspr.domain.item.service.ItemService;
import com.tea1.stockdspr.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    //아이템 정보 등록
    //아이템 Id만 반환
    @PostMapping("/item")
    public ResponseEntity<ApiResponse<Map<String, Long>>> createItem(@RequestBody @Valid ItemRequestDTO itemRequestDTO) {

        Long itemId = itemService.createItem(itemRequestDTO);
        Map<String, Long> result = Map.of("itemId", itemId);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.response(result));
    }

    //아이템 정보
    //아이템 정보 반환
    @GetMapping("/item/{itemId}")
    public ResponseEntity<ApiResponse<ItemResponseDTO>> getItem(@PathVariable Long itemId) {

        ItemResponseDTO dto = itemService.findOne(itemId);

        return ResponseEntity.ok(ApiResponse.response(dto));
    }


    //재고 수정
    //반환값 없음
    @PatchMapping("/item/{itemId}")
    public ResponseEntity<ApiResponse<Void>> updateItem(@PathVariable Long itemId, @RequestBody @Valid ItemRequestDTO itemRequestDTO) {

        itemService.updateItem(itemId, itemRequestDTO);
        return ResponseEntity.ok(ApiResponse.response(null));
    }

    //아이템 삭제
    //삭제 품목 반환
    @DeleteMapping("/item/{itemId}")
    public ResponseEntity<ApiResponse<ItemResponseDTO>> deleteItem(@PathVariable Long itemId) {
        ItemResponseDTO dto = itemService.findOne(itemId);
        itemService.deleteItem(itemId);
        return ResponseEntity.ok(ApiResponse.response(dto));
    }
}
