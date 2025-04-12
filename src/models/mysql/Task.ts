import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

// These are the attributes in the Task model
export interface TaskAttributes {
  id: number;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  ownerId: number;  // Foreign key reference
  status: 'pending' | 'completed';
}

// Some attributes are optional when creating a new Task
interface TaskCreationAttributes extends Optional<TaskAttributes, 'id'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: number;
  public title!: string;
  public description!: string;
  public dueDate!: Date;
  public priority!: 'low' | 'medium' | 'high';
  public ownerId!: number;
  public status!: 'pending' | 'completed';

  // Association methods
  public static associate(models: any): void {
    Task.belongsTo(models.User, { foreignKey: 'ownerId', as: 'owner' });
  }
}

export default function (sequelize: Sequelize): typeof Task {
  Task.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: {
            args: [3, 255],
            msg: 'Title must be at least 3 characters long'
          }
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isAfter: {
            args: new Date().toString(),
            msg: 'Due date must be a future date'
          }
        }
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
      },
      ownerId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed'),
        defaultValue: 'pending',
      }
    },
    {
      sequelize,
      tableName: 'tasks',
      timestamps: true,
    }
  );

  return Task;
}