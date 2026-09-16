#ifndef DSA_MEMBERS_NGOC_TRAM_DANH_SACH_GAN_DAY_CPP
#define DSA_MEMBERS_NGOC_TRAM_DANH_SACH_GAN_DAY_CPP

#include "shared/kieu_du_lieu.cpp"
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>
#include <cstddef>
#include <utility>

namespace dsa::ngoc_tram
{

    class RecentList
    {
    public:
        explicit RecentList(std::size_t capacity = 6) : capacity_(capacity) {}
        RecentList(const RecentList &other) : capacity_(other.capacity_)
        {
            copy_from(other);
        }
        RecentList &operator=(const RecentList &other)
        {
            if (this != &other)
            {
                clear();
                capacity_ = other.capacity_;
                copy_from(other);
            }
            return *this;
        }
        RecentList(RecentList &&other) noexcept
            : capacity_(other.capacity_), head_(other.head_), tail_(other.tail_), index_(std::move(other.index_))
        {
            other.capacity_ = 0;
            other.head_ = nullptr;
            other.tail_ = nullptr;
            other.index_.clear();
        }
        RecentList &operator=(RecentList &&other) noexcept
        {
            if (this != &other)
            {
                clear();
                capacity_ = other.capacity_;
                head_ = other.head_;
                tail_ = other.tail_;
                index_ = std::move(other.index_);
                other.head_ = nullptr;
                other.tail_ = nullptr;
                other.index_.clear();
                other.capacity_ = 0;
            }
            return *this;
        }
        ~RecentList() { clear(); }
        void touch(const RecentUpdate &update);
        std::vector<RecentUpdate> snapshot() const;
        std::size_t size() const;
        std::size_t capacity() const { return capacity_; }

    private:
        struct Node
        {
            RecentUpdate data;
            Node *prev = nullptr;
            Node *next = nullptr;
        };

        std::size_t capacity_;
        Node *head_ = nullptr;
        Node *tail_ = nullptr;
        std::unordered_map<std::string, Node *> index_;
        void unlink(Node *node)
        {
            if (node->prev)
                node->prev->next = node->next;
            else
                head_ = node->next;
            if (node->next)
                node->next->prev = node->prev;
            else
                tail_ = node->prev;
            node->prev = nullptr;
            node->next = nullptr;
        }
        void push_front(Node *node)
        {
            node->prev = nullptr;
            node->next = head_;
            if (head_)
                head_->prev = node;
            head_ = node;
            if (!tail_)
                tail_ = node;
        }
        void move_to_front(Node *node)
        {
            if (head_ == node)
                return;
            unlink(node);
            push_front(node);
        }
        void evict_tail()
        {
            Node *victim = tail_;
            if (!victim)
                return;
            unlink(victim);
            index_.erase(victim->data.sku);
            delete victim;
        }
        void clear()
        {
            Node *cur = head_;
            while (cur)
            {
                Node *next = cur->next;
                delete cur;
                cur = next;
            }
            head_ = nullptr;
            tail_ = nullptr;
            index_.clear();
        }
        void copy_from(const RecentList &other)
        {
            head_ = nullptr;
            tail_ = nullptr;
            index_.clear();
            std::vector<Node *> oldest_to_newest;
            for (Node *cur = other.tail_; cur != nullptr; cur = cur->prev)
            {
                oldest_to_newest.push_back(cur);
            }
            for (Node *src : oldest_to_newest)
            {
                Node *node = new Node{src->data, nullptr, nullptr};
                push_front(node);
                index_[node->data.sku] = node;
            }
        }
    };

} // namespace dsa::ngoc_tram

#include "shared/bao_loi.cpp"

namespace dsa::ngoc_tram
{

    void RecentList::touch(const RecentUpdate &update)
    {
        if (update.sku.empty())
        {
            throw std::invalid_argument("RecentList::touch: SKU rong");
        }
        if (capacity_ == 0)
        {
            return;
        }
        auto it = index_.find(update.sku);
        if (it != index_.end())
        {
            Node *node = it->second;
            node->data = update;
            move_to_front(node);
            return;
        }
        Node *node = new Node{update, nullptr, nullptr};
        push_front(node);
        index_[update.sku] = node;
        if (index_.size() > capacity_)
        {
            evict_tail();
        }
    }

    std::vector<RecentUpdate> RecentList::snapshot() const
    {
        std::vector<RecentUpdate> result;
        result.reserve(index_.size());
        for (Node *cur = head_; cur != nullptr; cur = cur->next)
        {
            result.push_back(cur->data);
        }
        return result;
    }
    std::size_t RecentList::size() const { return index_.size(); }

} // namespace dsa::ngoc_tram

#endif
