import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity('tbl_user_images')
export class UserImages {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Field()
    @Index('idx_user_uuid')
    @Column({ name: 'user_uuid', type: 'uuid' })
    public userUuid: string;

    @Column({ name: 'image_original_name', type: 'varchar', length: '255' })
    @Field()
    public imageOriginalName: string;

    @Column({ name: 'image_mime_type', type: 'varchar', length: '100' })
    @Field()
    public imageMimeType: string;

    @Column({ name: 'image_size', type: 'numeric', precision: 10, scale: 2 })
    @Field()
    public imageSize: number;

    @Column({ name: 'image_filename', type: 'varchar', length: '255' })
    @Field()
    public imageFilename: string;

    @Column({ name: 'image_path', type: 'varchar', length: '255' })
    @Field()
    public imagePath: string;

    @Index('idx_image_url')
    @Column({ name: 'image_url', type: 'varchar', length: '255' })
    @Field()
    public imageUrl: string;

    @Field()
    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    public createdAt: Date;

    @Field()
    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    public updatedAt: Date;
}