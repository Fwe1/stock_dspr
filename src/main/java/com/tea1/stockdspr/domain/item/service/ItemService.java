package com.tea1.stockdspr.domain.item.service;

import com.tea1.stockdspr.domain.item.dto.ItemRequestDTO;
import com.tea1.stockdspr.domain.item.dto.ItemResponseDTO;
import com.tea1.stockdspr.domain.item.entity.Item;
import com.tea1.stockdspr.domain.item.repository.ItemRepository;
import com.tea1.stockdspr.domain.stock.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;
    private final StockRepository stockRepository;

    //C
    @Transactional
    public Long createItem(ItemRequestDTO itemRequestDTO) {

        Item item = Item.builder()
                .name(itemRequestDTO.getName())
                .ingredients(itemRequestDTO.getIngredients())
                .storageConditions(itemRequestDTO.getStorageConditions())
                .build();
        Item savedItem = itemRepository.save(item);
        return savedItem.getId();
    }

    //U
    @Transactional
    public void updateItem(Long itemId, ItemRequestDTO dto) {

        Item i = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이템입니다. itemId = " + itemId));

        i.itemUpdateInfo(dto.getName(), dto.getIngredients(), dto.getStorageConditions());

    }

    //R
    public List<Item> findItems() {
        return itemRepository.findAll();
    }

    public ItemResponseDTO findOne(Long itemId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이템입니다. itemId = " + itemId));
        ItemResponseDTO dto = ItemResponseDTO.builder()
                .id(item.getId())
                .name(item.getName())
                .ingredients(item.getIngredients())
                .storageConditions(item.getStorageConditions()).build();

        return dto;
    }

    //D
    @Transactional
    public void deleteItem(Long itemId) {

        itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이템입니다. itemId = " + itemId));

        if(!stockRepository.existsByItem_Id(itemId)) {
            itemRepository.deleteById(itemId);
        } else throw new IllegalStateException("재고가 등록된 품목은 삭제할 수 없습니다. itemId = " + itemId);

    }


    //권한


}

