package com.tea1.stockdspr.domain.item.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder @Table(name = "item")
public class Item {

    @Id @GeneratedValue
    @Column(name = "item_id")
    private Long id;

    private String name;

    private String ingredients;

    private String storageConditions;

    //비지니스 용도
    public void itemUpdateInfo(String name, String ingredients, String storageConditions) {

        if(name != null) {
            this.name = name;
        }
        if(ingredients != null) {
            this.ingredients = ingredients;
        }
        if(storageConditions != null) {
            this.storageConditions = storageConditions;
        }


    }

}
